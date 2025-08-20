import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  InputGroup,
  Form,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  Search,
  RefreshCw,
  Calendar,
  Globe,
  AlertTriangle,
  Trash2,
  Plus,
  User,
  CheckCircle2,
  Server,
  Network,
  Clock,
} from "lucide-react";

// const API_BASE = "https://domain-dash-node.onrender.com";
const API_BASE = "http://localhost:3000";

const App = () => {
  const [domains, setDomains] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expiryFilter, setExpiryFilter] = useState(null);

  // Fetch all domains with SSL data in one API call
  const fetchAllDomainsWithSSLData = async () => {
    setGlobalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/certificate-bulk`);
      if (!res.ok) throw new Error("Failed to fetch domains");
      const domainsWithSSLData = await res.json();
      setDomains(domainsWithSSLData);
    } catch (error) {
      console.error("Failed to fetch domain list", error);
      // Fallback to empty array if bulk endpoint fails
      setDomains([]);
    }
    setGlobalLoading(false);
  };

  // Create domain and get SSL data in one call
  const createDomain = async () => {
    if (!newDomain.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/certificate-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Creation failed");
      }

      const result = await res.json();

      // Add the new domain with SSL data to the existing list
      setDomains((prevDomains) => [result.domain, ...prevDomains]);
      setNewDomain("");
    } catch (err) {
      console.error("Failed to create domain:", err);
      alert(`Failed to add domain: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Delete domain
  const deleteDomain = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/certificate-delete/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete domain");

      // Remove domain from local state
      setDomains((prevDomains) => prevDomains.filter((d) => d._id !== id));
    } catch (err) {
      console.error("Failed to delete domain:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Refresh single domain (optional - for individual refresh buttons)
  const refreshSingleDomain = async (domainId) => {
    try {
      const res = await fetch(`${API_BASE}/certificate-single/${domainId}`);
      if (!res.ok) throw new Error("Failed to refresh domain");

      const updatedDomain = await res.json();

      // Update the specific domain in the list
      setDomains((prevDomains) =>
        prevDomains.map((d) => (d._id === domainId ? updatedDomain : d))
      );
    } catch (err) {
      console.error("Failed to refresh single domain:", err);
    }
  };

  const getDaysUntilExpiry = (unix) => {
    if (!unix) return null;
    const now = new Date();
    const diff = new Date(unix * 1000) - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStats = () => {
    const active = domains.filter((d) => d.status === "success").length;
    const errors = domains.filter((d) => d.status === "error").length;
    const expiringSoon = domains.filter((d) => {
      const days = getDaysUntilExpiry(d.data?.expiration_date);
      return days !== null && days < 30;
    }).length;
    return { total: domains.length, active, errors, expiringSoon };
  };

  // Handle Enter key press in domain input
  const handleDomainInputKeyPress = (e) => {
    if (e.key === "Enter" && !creating) {
      createDomain();
    }
  };

  useEffect(() => {
    fetchAllDomainsWithSSLData();
  }, []);

  const filteredDomains = domains.filter((d) => {
    const matchesSearch = d.domain
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    if (expiryFilter !== null) {
      const days = getDaysUntilExpiry(d.data?.expiration_date);
      if (days === null) return false;

      if (expiryFilter === 0) return matchesSearch && days === 0;
      if (expiryFilter === 2) return matchesSearch && days <= 2;
      if (expiryFilter === 7) return matchesSearch && days <= 7;
      if (expiryFilter === 30) return matchesSearch && days <= 30;
    }

    return matchesSearch;
  });

  const stats = getStats();

  // Function to render a tooltip for the raw expiry date
  const renderExpiryTooltip = (props, rawDate) => (
    <Tooltip id="expiry-tooltip" {...props}>
      Raw expiry: {rawDate || "N/A"}
    </Tooltip>
  );

  return (
    <div
      style={{
        background: "#f1f3f4",
        minHeight: "100vh",
        paddingTop: "30px",
        paddingBottom: "30px",
      }}
    >
      <Container fluid="lg">
        {/* Header */}
        <Row className="align-items-center mb-4 g-3">
          {/* Column 1: Title & Subtitle */}
          <Col lg={4} md={6}>
            <div>
              <h4 className="fw-bold text-primary mb-1">SSL Expiry Monitor</h4>
              <div className="text-muted small">Powered by Clirnet</div>
            </div>
          </Col>

          {/* Column 2: Input + Add Button */}
          <Col lg={4} md={6}>
            <InputGroup>
              <Form.Control
                placeholder="Add new domain (e.g., example.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyPress={handleDomainInputKeyPress}
                disabled={creating}
              />
              <Button
                variant="primary"
                onClick={createDomain}
                disabled={creating || !newDomain.trim()}
              >
                {creating ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <Plus size={16} className="me-1" /> Add
                  </>
                )}
              </Button>
            </InputGroup>
          </Col>

          {/* Column 3: Refresh Button */}
          <Col lg={4} className="text-lg-end">
            <Button
              onClick={fetchAllDomainsWithSSLData}
              variant="primary"
              className="d-flex align-items-center ms-lg-auto"
              disabled={globalLoading}
            >
              {globalLoading ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <RefreshCw className="me-2" size={16} />
              )}
              {globalLoading ? "Refreshing..." : "Refresh All"}
            </Button>
          </Col>
        </Row>

        {/* Stats */}
        <Row className="mb-3 g-3">
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Total Domains</h6>
                <h5 className="fw-bold">{stats.total}</h5>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Active</h6>
                <h5 className="fw-bold text-success">{stats.active}</h5>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Expiring Soon</h6>
                <h5 className="fw-bold text-warning">{stats.expiringSoon}</h5>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap">
                  <h6 className="text-muted m-0">Expired Emails Sent To</h6>
                  <span className="badge bg-light text-success fw-semibold">
                    <CheckCircle2 className="me-1" size={14} />
                    Total 14
                  </span>
                </div>

                <div className="d-flex align-items-center text-muted small">
                  <User size={14} className="me-2" />
                  <span
                    className="text-truncate"
                    style={{ maxWidth: "100%", marginBottom: "9px" }}
                  >
                    suman****@clirnet.com
                  </span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Loading indicator for global refresh */}
        {globalLoading && (
          <Alert variant="info" className="d-flex align-items-center">
            <Spinner size="sm" className="me-2" />
            Fetching SSL certificate data for all domains... This may take a few
            moments.
          </Alert>
        )}

        {/* Warning */}
        {stats.expiringSoon > 0 && (
          <Alert variant="warning" className="d-flex align-items-center">
            <AlertTriangle className="me-2" />
            {stats.expiringSoon} domain(s) are expiring in less than 30 days!
          </Alert>
        )}

        {/* Search Input */}
        <InputGroup className="mb-4">
          <InputGroup.Text>
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Form.Select
            style={{ maxWidth: "200px" }}
            value={expiryFilter ?? ""}
            onChange={(e) => {
              const value =
                e.target.value === "" ? null : parseInt(e.target.value);
              setExpiryFilter(value);
            }}
          >
            <option value="">All Expiry</option>
            <option value="0">Expired</option>
            <option value="2">2 Days</option>
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
          </Form.Select>
        </InputGroup>

        {/* Domain Table */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            {filteredDomains.length === 0 && !globalLoading ? (
              <div className="text-center py-5">
                <Globe size={48} className="text-muted mb-3" />
                <h5 className="text-muted">No domains found</h5>
                <p className="text-muted">
                  {domains.length === 0
                    ? "Add your first domain to get started"
                    : "Try adjusting your search filters"}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light text-muted">
                    <tr>
                      <th className="px-4 py-3">Domain</th>
                      <th>Status</th>
                      <th>DNS Host</th>
                      <th>Name Servers</th>
                      <th>Registrar</th>
                      <th>Issued On</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDomains.map((d) => {
                      const days = getDaysUntilExpiry(d.data?.expiration_date);
                      return (
                        <tr key={d._id}>
                          <td className="px-4 py-3">
                            <div className="d-flex align-items-center">
                              <Globe
                                size={16}
                                className="me-2 text-muted"
                                color="#0d6efd"
                              />
                              <a
                                href={`https://${d.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-decoration-none text-dark link-hover"
                              >
                                {d.domain}
                              </a>
                            </div>
                          </td>
                          <td>
                            <Badge
                              bg={
                                d.status === "success"
                                  ? "success"
                                  : d.status === "error"
                                  ? "danger"
                                  : "secondary"
                              }
                            >
                              {d.status === "loading" ? "Loading..." : d.status}
                            </Badge>
                          </td>
                          <td>
                            {d.dnsHost && d.dnsHost.length > 0 ? (
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip id={`dns-tooltip-${d._id}`}>
                                    {d.dnsHost.join(", ")}
                                  </Tooltip>
                                }
                              >
                                <Badge
                                  bg="secondary"
                                  className="cursor-pointer"
                                >
                                  <Server size={12} className="me-1" />
                                  {d.dnsHost.length} IP(s)
                                </Badge>
                              </OverlayTrigger>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            {d.nameServers && d.nameServers.length > 0 ? (
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip id={`ns-tooltip-${d._id}`}>
                                    {d.nameServers.join(", ")}
                                  </Tooltip>
                                }
                              >
                                <Badge
                                  bg="secondary"
                                  className="cursor-pointer"
                                >
                                  <Network size={12} className="me-1" />
                                  {d.nameServers.length} NS
                                </Badge>
                              </OverlayTrigger>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>{d.data?.registrar || "-"}</td>
                          <td>
                            {d.data?.issued_date
                              ? new Date(
                                  d.data.issued_date * 1000
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="d-flex flex-column">
                                <div>
                                  {d.data?.expiration_date
                                    ? new Date(
                                        d.data.expiration_date * 1000
                                      ).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "2-digit",
                                      })
                                    : "-"}
                                </div>
                                <div className="bg-light text-muted small ps-2 rounded">
                                  {d.data?.expiration_date
                                    ? new Date(
                                        d.data.expiration_date * 1000
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: true, // set false if you want 24h format
                                      })
                                    : "-"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {days !== null ? (
                              <Badge
                                bg={
                                  days < 7
                                    ? "danger"
                                    : days < 14
                                    ? "warning"
                                    : days < 30
                                    ? "success"
                                    : "success"
                                }
                              >
                                {days < 0 ? "Expired" : `${days} days`}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              {/* Optional: Individual refresh button */}
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => refreshSingleDomain(d._id)}
                                title="Refresh this domain"
                              >
                                <RefreshCw size={14} />
                              </Button>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => deleteDomain(d._id)}
                                disabled={deletingId === d._id}
                                className="text-danger"
                                title="Delete domain"
                              >
                                {deletingId === d._id ? (
                                  <Spinner size="sm" animation="border" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default App;
