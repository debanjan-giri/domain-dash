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
} from "react-bootstrap";
import {
  Search,
  RefreshCw,
  Calendar,
  Globe,
  AlertTriangle,
  Trash2,
  Plus,
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

  const parseDateString = (dateStr) => {
    const [datePart, timePart] = dateStr.split(",");
    const [day, month, year] = datePart.trim().split("/").map(Number);
    const [hours, minutes, seconds] = timePart.trim().split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  const fetchWhoisData = async (domain) => {
    try {
      const res = await fetch(`${API_BASE}/certificate-info?domain=${domain}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      console.log(data);
      return {
        registrar: data.issuer?.organization || "-",
        expiration_date: data.expiresOn
          ? parseDateString(data.expiresOn).getTime() / 1000
          : null,
        issued_date: data.issuedOn
          ? parseDateString(data.issuedOn).getTime() / 1000
          : null,
      };
    } catch {
      return null;
    }
  };

  const fetchDomainList = async () => {
    setGlobalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/certificate-list`);
      const list = await res.json();
      const updated = await Promise.all(
        list.map(async (d) => {
          const data = await fetchWhoisData(d.domain);
          return {
            ...d,
            data,
            status: data ? "success" : "error",
            lastChecked: new Date(),
          };
        })
      );
      setDomains(updated);
    } catch (error) {
      console.error("Failed to fetch domain list", error);
    }
    setGlobalLoading(false);
  };

  const createDomain = async () => {
    if (!newDomain) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/certificate-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      });
      if (!res.ok) throw new Error("Creation failed");
      setNewDomain("");
      await fetchDomainList();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const deleteDomain = async (id) => {
    setDeletingId(id);
    try {
      await fetch(`${API_BASE}/certificate-delete/${id}`, {
        method: "DELETE",
      });
      await fetchDomainList();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
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

  useEffect(() => {
    fetchDomainList();
  }, []);

  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const stats = getStats();

  return (
    <div
      style={{ background: "#f1f3f4", minHeight: "100vh", paddingTop: "30px" }}
    >
      <Container fluid="lg">
        {/* Header */}
        <Row className="align-items-center mb-4 g-3">
          {/* Column 1: Title & Subtitle */}
          <Col lg={4} md={6}>
            <div>
              <h4 className="fw-bold text-primary mb-1">SSL Domain Monitor</h4>
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
              />
              <Button
                variant="primary"
                onClick={createDomain}
                disabled={creating}
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
              onClick={fetchDomainList}
              variant="primary"
              className="d-flex align-items-center ms-lg-auto"
              disabled={globalLoading}
            >
              {globalLoading ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <RefreshCw className="me-2" size={16} />
              )}
              Refresh All
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
              <Card.Body>
                <h6 className="text-muted">Automated Emails Sent</h6>
                <h5 className="fw-bold text-danger">10</h5>
              </Card.Body>
            </Card>
          </Col>
        </Row>

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
            placeholder="Search in Table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Domain Table */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light text-muted">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th>Status</th>
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
                    <tr key={d.id}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center">
                          <Globe size={16} className="me-2 text-muted" />
                          {d.domain}
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
                      <td>{d.data?.registrar || "-"}</td>
                      <td>
                        {d.data?.issued_date
                          ? new Date(
                              d.data.issued_date * 1000
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {d.data?.expiration_date
                          ? new Date(
                              d.data.expiration_date * 1000
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {days !== null ? (
                          <Badge
                            bg={
                              days < 30
                                ? "danger"
                                : days < 90
                                ? "warning"
                                : "success"
                            }
                          >
                            {days} days
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => deleteDomain(d.id)}
                          disabled={deletingId === d.id}
                        >
                          {deletingId === d.id ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default App;
